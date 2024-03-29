#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#%%
import pandas as pd
from shapely.geometry import Point, shape
import simplejson as json
#%%

df = pd.read_csv('fires-aug-dec2.csv', dtype={'acq_time': object})

with open('bounding.json') as f:
	areas = json.load(f)

for area in areas['features']:

	print("procesing",area['properties']['name']) 
	def checkPos(row):
		polygon = shape(area['geometry'])
		point = Point(row.longitude, row.latitude)
		if polygon.contains(point):
			return True
		else:
			return False	
			
	df['inBounds'] = df.apply(checkPos, axis=1)  

	within = df[df['inBounds'] == True]
	within = within[within['confidence'] > 33]
	within['time'] = within['acq_date'] + " " + within['acq_time']
	within['date'] = pd.to_datetime(within['acq_date'])

	within = within[within['date'] > area['properties']['startDate']]

	within = within[['latitude','longitude','time']]
	within.to_csv('../data/{filename}.csv'.format(filename=area['properties']['name'].replace(" ", "_")), index=False)