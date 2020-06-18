#! /usr/bin/python
#encoding=utf-8

import json

from flask import Flask
from flask import json
from flask import request
from flask import send_from_directory
from flask import Response
import requests

import xmlparser
import base64
import hashlib

app = Flask(__name__, static_url_path='')

def from_request(request, k):
    if not request.json:
        raise Exception("Invalid Request")
    return str(request.json[k])

def req(url, method):
    command = requests.get
    if method == 'DELETE':
        command = requests.delete
    elif method == 'PUT':
        command = requests.put
    elif method == 'POST':
        command = requests.post
    r = command(url)
    return r.status_code


@app.route("/createbucket", methods = ['POST'])
def create():
  url = from_request(request, 'url')
  statuscode = req(url, 'PUT')

  if statuscode == 200:
     resp = Response(response='Success', status=statuscode)
  elif statuscode == 400:
      resp = Response(response='Invalid Bucket Name', status=statuscode)
  elif statuscode == 409:
     resp = Response(response='Conflict: Bucket already Exists',
                     status=statuscode)
  elif statuscode == 403:
     resp = Response(response='Access Denied', status=statuscode)
  else:
     resp = Response(response='Unknown Error', status=500)
  return resp


@app.route("/deletebucket", methods = ['DELETE'])
def delete():
  url = from_request(request, 'url')
  statuscode = req(url, 'DELETE')

  if statuscode == 204:
     resp = Response(status=200)
  elif statuscode == 404:
     resp = Response(response='Bucket Not Exist', status=statuscode)
  elif statuscode == 403:
     resp = Response(response='Access Denied', status=statuscode)
  elif statuscode == 409:
     resp = Response(response='Confilct: Object Still Exists',
                     status=statuscode)
  else:
     resp = Response(response='Unknown Error', status=500)
  return resp

@app.route("/putcors", methods = ['PUT'])
def putcors():
  corsurl = from_request(request, 'url')
  s3auth = from_request(request, 's3auth')
  date = from_request(request, 'date')

  cors = '''
<CORSConfiguration>
  <CORSRule>
      <AllowedMethod>PUT</AllowedMethod>
      <AllowedMethod>GET</AllowedMethod>
      <AllowedMethod>POST</AllowedMethod>
      <AllowedMethod>DELETE</AllowedMethod>
      <AllowedOrigin>*</AllowedOrigin>
      <AllowedHeader>*</AllowedHeader>
      <ExposeHeader>x-amz-acl</ExposeHeader>
      <ExposeHeader>ETag</ExposeHeader>
  </CORSRule>
</CORSConfiguration>'''
  content_md5 = base64.b64encode(hashlib.md5(cors.encode('utf8')).digest())

  headers = {
      'Content-type':'text/xml',
      'Content-MD5':content_md5,
      'Authorization':s3auth,
      'Date' : date
  }

  r  = requests.put(corsurl, headers=headers, data=cors)
  statuscode = r.status_code

  if statuscode == 200:
     resp = Response(status=statuscode)
  elif statuscode == 403:
     resp = Response(response='Access Denied', status=statuscode)
  else:
     resp = Response(response='Unknown Error', status=500)
  return resp

@app.route("/getservice", methods = ['POST'])
def listbucketsurl():
  url = from_request(request, 'url')
  s3auth = from_request(request, 's3auth')
  date = from_request(request, 'date')

  headers = {'Authorization':s3auth, 'x-amz-date': date}

  r = requests.get(url, headers=headers)

  statuscode = r.status_code

  if statuscode != 200:
     if statuscode == 403:
        resp = Response(response='Access Denied', status=statuscode)
     else:
        resp = Response(response='Unknown Error', status=500)
     return resp

  content = r.text

  buckets = xmlparser.getListFromXml(content, 'Bucket')
  resp = Response(response=json.dumps(buckets), status=statuscode)
  resp.headers['Content-type'] = 'application/json; charset=UTF-8'
  return resp

@app.route("/")
def root():
    return app.send_static_file('buckets.html')

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True)
