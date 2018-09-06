#!/bin/bash
# Startup script for build-flag
#
# Edit crontab file by running crontab -e
# Add the following line refering to this file's position
#  @reboot /usr/bin/sudo -u pi -H sh /home/pi/cloud-status/startup.sh
#

cd /home/pi/cloud-status
sudo npm start >> cloud-status.log 2>> cloud-status.log
