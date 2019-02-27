FROM centos:7.2.1511

WORKDIR /sree
COPY ["static", "/sree/static"]
COPY ["xmlparser.py", "app.py", "/sree/"]

RUN yum install -y epel-release
RUN yum install -y python2-pip
RUN pip install flask requests

ENTRYPOINT ["python", "/sree/app.py"]
