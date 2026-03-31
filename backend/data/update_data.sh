#!/bin/bash

source /home/miniconda/bin/activate fundlord
cd /home/fundlord/backend/data
python update_data.py > /home/fundlord/logs/update_data.log 2>&1