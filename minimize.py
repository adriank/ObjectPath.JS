#!/usr/bin/python

import httplib, urllib, sys

# Define the parameters for the POST request and encode them in
# a URL-safe format.

def shorten(fileName):
	f=open("src/"+fileName+".js")
	s=""
	for l in f:
		if l.find("console") is -1:
			s+=l

	params = urllib.urlencode([
			('js_code', s),
			('compilation_level', 'SIMPLE_OPTIMIZATIONS'),
			('output_format', 'text'),
			('output_info', 'compiled_code'),
		])

	# Always use the following value for the Content-type header.
	headers = { "Content-type": "application/x-www-form-urlencoded" }
	conn = httplib.HTTPConnection('closure-compiler.appspot.com')
	conn.request('POST', '/compile', params, headers)
	response = conn.getresponse()
	data = response.read()
	conn.close()
	return data

a=shorten("tokens")
b=shorten("parse")
c=shorten("interpreter")

open("build/op.min.js","w").write(a+b+c)
