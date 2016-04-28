# XML parser code copied from s3cmd
# http://github.com/s3tools/s3cmd
# Licensed under GPLv2

import re

try:
    import xml.etree.ElementTree as ET
except ImportError:
    import elementtree.ElementTree as ET
from xml.parsers.expat import ExpatError

def parseNodes(nodes):
    ## WARNING: Ignores text nodes from mixed xml/text.
    ## For instance <tag1>some text<tag2>other text</tag2></tag1>
    ## will be ignore "some text" node
    retval = []
    for node in nodes:
        retval_item = {}
        for child in node.getchildren():
            name = child.tag
            if child.getchildren():
                retval_item[name] = parseNodes([child])
            else:
                retval_item[name] = node.findtext(".//%s" % child.tag)
        retval.append(retval_item)
    return retval

def stripNameSpace(xml):
    """
    removeNameSpace(xml) -- remove top-level AWS namespace
    """
    r = re.compile('^(<?[^>]+?>\s?)(<\w+) xmlns=[\'"](http://[^\'"]+)[\'"](.*)', re.MULTILINE)
    if r.match(xml):
        xmlns = r.match(xml).groups()[2]
        xml = r.sub("\\1\\2\\4", xml)
    else:
        xmlns = None
    return xml, xmlns

def getTreeFromXml(xml):
    xml, xmlns = stripNameSpace(xml)
    try:
        tree = ET.fromstring(xml)
        if xmlns:
            tree.attrib['xmlns'] = xmlns
        return tree
    except ExpatError, e:
        error(e)
        raise Exceptions.ParameterError("Bucket contains invalid filenames.")
    except Exception, e:
        error(e)
        error(xml)
        raise

def getListFromXml(xml, node):
    tree = getTreeFromXml(xml)
    nodes = tree.findall('.//%s' % (node))
    return parseNodes(nodes)

def getDictFromTree(tree):
    ret_dict = {}
    for child in tree.getchildren():
        if child.getchildren():
            ## Complex-type child. Recurse
            content = getDictFromTree(child)
        else:
            content = child.text
        if ret_dict.has_key(child.tag):
            if not type(ret_dict[child.tag]) == list:
                ret_dict[child.tag] = [ret_dict[child.tag]]
            ret_dict[child.tag].append(content or "")
        else:
            ret_dict[child.tag] = content or ""
    return ret_dict

def getTextFromXml(xml, xpath):
    tree = getTreeFromXml(xml)
    if tree.tag.endswith(xpath):
        return decode_from_s3(tree.text) if tree.text is not None else None
    else:
        result = tree.findtext(xpath)
        return decode_from_s3(result) if result is not None else None

def decode_from_s3(string, errors = "replace"):
    """
    Convert S3 UTF-8 'string' to Unicode or raise an exception.
    """
    if type(string) == unicode:
        return string
    # Be quiet by default
    #debug("Decoding string from S3: %r" % string)
    try:
        return unicode(string, "UTF-8", errors)
    except UnicodeDecodeError:
        raise UnicodeDecodeError("Conversion to unicode failed: %r" % string)
