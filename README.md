# xiaomi-zigbee-adapter
Xiaomi Zigbee adapter add-on for Mozilla IoT Gateway

# Manual Installation
This add-on is not currently available via the add-ons list, so manual installation is required.

```bash
$ cd ~/mozilla-iot/gateway/addons
$ git clone https://github.com/DurandA/xiaomi-zigbee-adapter
$ cd xiaomi-zigbee-adapter
$ npm install .
```

After doing this, you should be able to go into _Settings -> Add-ons_ on the gateway UI and enable the new add-on. After doing so, any discovered devices will show up in the usual "Add Things" screen (_Things -> +_).

## Supported Hardware
### Adapters
* CC2531 USB stick flashed with CC2531ZNP-Pro-Secure_LinkKeyJoin.hex from here: https://github.com/mtornblad/zstack-1.2.2a.44539/tree/master/CC2531
### Devices
| ref        | description                                      | supported            |
|------------|--------------------------------------------------|----------------------|
| WSDCGQ01LM | Mijia Smart Home Temperature and Humidity Sensor | :heavy_check_mark:   |
| WSDCGQ11LM | Aqara Temperature and Humidity Sensor            | :heavy_check_mark:   |
| RTCGQ11LM  | Aqara Human Body Sensor                          | :x:                  |
| MCCGQ11LM  | Aqara Window and Door Sensor                     | :x:                  |
| WXKG01LM   | Mijia Smart Wireless Switch                      | :x:                  |
| WXKG02LM   | Aqara Smart Light Switch Wireless Version        | :x:                  |
