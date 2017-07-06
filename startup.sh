#!/bin/bash
# Startup script for build-flag
#
# Edit crontab file by running crontab -e
# Add the following line refering to this file's position
#  @reboot /usr/bin/sudo -u pi -H sh /home/pi/build-flag2/startup.sh
#

cd /home/pi/build-flag2
sudo node server.js

