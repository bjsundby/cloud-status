#!/bin/bash
# Startup script for build-flag
#
# Edit crontab file by running crontab -e
# Add the following line refering to this file's position
#  @reboot /usr/bin/sudo -u pi -H sh /home/pi/share/build-flag/startup.sh
#

cd /home/pi/share/build-flag
sudo npm start
