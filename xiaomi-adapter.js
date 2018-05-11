/**
 * xiaomi-adapter.js - Xiaomi adapter for CC2531.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

var ZShepherd = require('zigbee-shepherd');

let Adapter, Device, Property;
try {
  Adapter = require('../adapter');
  Device = require('../device');
  Property = require('../property');
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') {
    throw e;
  }

  const gwa = require('gateway-addon');
  Adapter = gwa.Adapter;
  Device = gwa.Device;
  Property = gwa.Property;
}

const WSDCGQ01LM = {
  type: 'thing',
  name: 'Xiaomi Mijia Smart Home Temperature and Humidity Sensor',
  properties: {
    temperature: {
      type: 'number',
      unit: 'celcius'
    },
    humidity: {
      type: 'number',
      unit: 'percent'
    }
  }
};

const WSDCGQ11LM = {
  type: 'thing',
  name: 'Xiaomi Aqara Temperature and Humidity Sensor',
  properties: {
    temperature: {
      type: 'number',
      unit: 'celcius'
    },
    humidity: {
      type: 'number',
      unit: 'percent'
    },
    pressure: {
      type: 'number',
      unit: 'hectopascal'
    }
  }
};

const THINGS = {
  4151: { // Xiaomi
    'lumi.sens': WSDCGQ01LM,
    'lumi.weather': WSDCGQ11LM
  }
};

class GenProperty extends Property {
  setValue(value) {
    return super.setValue(value).then((value) => this.device.notifyPropertyChanged(this))
  }
}

class XiaomiDevice extends Device {
  constructor(adapter, id, template) {
    super(adapter, id);
    this.name = template.name;
    this.type = template.type;
    //this.description = template.description;
    for (const propertyName in template.properties) {
      const propertyDescription = template.properties[propertyName];
      const property = new GenProperty(this, propertyName,
                                       propertyDescription);
      this.properties.set(propertyName, property);
    }
  }
}

class XiaomiAdapter extends Adapter {
  constructor(addonManager, manifest) {
    super(addonManager, 'XiaomiAdapter', manifest.name);
    this.shepherd = new ZShepherd(manifest.moziot.config.port, {
      net: {
        panId: 0x1a62
      }
    });
    this.ready = new Promise((resolve, reject) => {
      this.shepherd.on('ready', (function() {
        console.log('Server is ready. Current devices:');
        this.shepherd.list().forEach(this.addDevice.bind(this));
        resolve(this.shepherd);
      }).bind(this));
    });
    this.shepherd.on('ind', this.handleIndication.bind(this));
    this.shepherd.start(function(err) { // start the server
      if (err)
        console.log(err);
    });
    addonManager.addAdapter(this);
  }

  handleDevIncoming(endpoints, data) {
    console.log('Device: ' + data + ' joining the network!');
    this.shepherd.list(data).forEach(this.addDevice.bind(this));
  }

  handleAttReport(endpoints, data) {
    console.log('attreport: ' + endpoints[0].device.ieeeAddr + ' ' + endpoints[0].devId + ' ' + endpoints[0].epId);
    if (!(endpoints[0].device.ieeeAddr in this.devices))
      return
    let device = this.devices[endpoints[0].device.ieeeAddr]
    switch (data.cid) {
      case 'genOnOff': // various switches
        break;
      case 'msTemperatureMeasurement':
        let temperature = parseFloat(data.data['measuredValue']) / 100.0;
        device.properties.get('temperature').setValue(temperature);
        break;
      case 'msRelativeHumidity':
        let humidity = parseFloat(data.data['measuredValue']) / 100.0;
        device.properties.get('humidity').setValue(humidity);
        break;
      case 'msPressureMeasurement':
        let pressure = parseFloat(data.data['16']) / 10.0;
        device.properties.get('pressure').setValue(pressure);
        break;
      case 'msOccupancySensing': // motion sensor
        break;
      case 'msIlluminanceMeasurement':
        break;
    }

    switch (endpoints[0].devId) {
      case 260: // WXKG01LM switch
        if (data.data['onOff'] == 0) { // click down
        } else if (data.data['onOff'] == 1) { // click release
        } else if (data.data['32768']) { // multiple clicks
        }
    }
  }

  handleIndication(msg) {
    switch (msg.type) {
      case 'devIncoming':
        this.handleDevIncoming(msg.endpoints, msg.data);
        break;
      case 'attReport':
        this.handleAttReport(msg.endpoints, msg.data);
        break;
      default:
        break;
    }
  }

  addDevice(dev) {
    return new Promise((resolve, reject) => {
      if (dev.ieeeAddr in this.devices) {
        reject('Device: ' + dev.ieeeAddr + ' already exists.');
      } else {
        if (dev.type === 'EndDevice')
          console.log(dev.ieeeAddr + ' ' + dev.nwkAddr + ' ' + dev.modelId);
        if (dev.manufId === 4151) // set all xiaomi devices to be online, so shepherd won't try to query info from devices (which would fail because they go tosleep)
          this.shepherd.find(dev.ieeeAddr,1).getDevice().update({ status: 'online', joinTime: Math.floor(Date.now()/1000) });
        if (!!THINGS[dev.manufId] && dev.modelId in THINGS[dev.manufId]) {
          const device = new XiaomiDevice(this, dev.ieeeAddr, THINGS[dev.manufId][dev.modelId]);
          this.handleDeviceAdded(device);
          resolve(device);
        } else {
          reject();
        }
      }
    });
  }

  /**
   * Example process ro remove a device from the adapter.
   *
   * The important part is to call: `this.handleDeviceRemoved(device)`
   *
   * @param {String} deviceId ID of the device to remove.
   * @return {Promise} which resolves to the device removed.
   */
  removeDevice(deviceId) {
    return new Promise((resolve, reject) => {
      const device = this.devices[deviceId];
      if (device) {
        shepherd.remove(deviceId, function (err) {
          if (!err) {
            this.handleDeviceRemoved(device);
            resolve(device);
          } else {
            reject(err);
          }
        });
      } else {
        reject('Device: ' + deviceId + ' not found.');
      }
    });
  }

  /**
   * Start the pairing/discovery process.
   *
   * @param {Number} timeoutSeconds Number of seconds to run before timeout
   */
  startPairing(_timeoutSeconds) {
    console.log('XiaomiAdapter:', this.name,
                'id', this.id, 'pairing started');

    this.ready.then(s => s.permitJoin(_timeoutSeconds, function(err) {
        if (err)
            console.log(err);
    }));
  }

  /**
   * Cancel the pairing/discovery process.
   */
  cancelPairing() {
    console.log('XiaomiAdapter:', this.name, 'id', this.id,
                'pairing cancelled');

    this.shepherd.permitJoin(0);
  }

  /**
   * Unpair the provided the device from the adapter.
   *
   * @param {Object} device Device to unpair with
   */
  removeThing(device) {
    console.log('XiaomiAdapter:', this.name, 'id', this.id,
                'removeThing(', device.id, ') started');

    this.removeDevice(device.id).then(() => {
      console.log('XiaomiAdapter: device:', device.id, 'was unpaired.');
    }).catch((err) => {
      console.error('XiaomiAdapter: unpairing', device.id, 'failed');
      console.error(err);
    });
  }

  /**
   * Cancel unpairing process.
   *
   * @param {Object} device Device that is currently being paired
   */
  cancelRemoveThing(device) {
    console.log('XiaomiAdapter:', this.name, 'id', this.id,
                'cancelRemoveThing(', device.id, ')');
  }
}

function loadXiaomiAdapter(addonManager, manifest, _errorCallback) {
  const adapter = new XiaomiAdapter(addonManager, manifest);
}

module.exports = loadXiaomiAdapter;
