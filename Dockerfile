FROM python:2.7

WORKDIR /sree
ADD static /sree
ADD xmlparser.py /sree
ADD app.py  /sree

RUN pip install flask pycurl

ENTRYPOINT ["python", "/sree/app.py"]
