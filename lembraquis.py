from __future__ import with_statement
from google.appengine.api import files

import os

from google.appengine.dist import use_library
use_library('django', '0.96')

from google.appengine.api import images
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.api import urlfetch
from django.utils import simplejson as json


import wsgiref.handlers
import random
import urlparse

class miditrack(db.Model):
  created_date = db.DateTimeProperty(auto_now_add=True)
  json = db.TextProperty()

class FfBaseHandler(webapp.RequestHandler):
  def template_path(self, filename):
    return os.path.join(os.path.dirname(__file__), filename)

  def render_to_response(self, filename, template_args):
    template_args.setdefault('current_uri', self.request.uri)
    self.response.out.write(
        template.render(self.template_path(filename), template_args))


class FfSlideshow(FfBaseHandler):
  def get(self):
    track = db.Query(miditrack)
    track = miditrack.all()
    track.order('-created_date')
    self.render_to_response('templatehtml/index.html', {
        'trk': track,
     })
        
class FfServeImage(webapp.RequestHandler):
    def get(self,pic_key):
        image = db.get(pic_key)
        self.response.headers['Content-Type'] = 'image/gif'
        self.response.out.write(image.data)

class FfDelete(webapp.RequestHandler):
  def get(self):
        #DELETE ALL PREVIOUS POSTS
        s = db.Query(miditrack)
        s = miditrack.all();
        for j in s:
            j.delete()


class FfUpdate(webapp.RequestHandler):
    def get(self,page):
        page_json = urlfetch.Fetch('http://www.reddit.com/r/'+page+'.json' )
        obj = json.loads(  page_json.content )
        for subs in  obj.get('data').get('children'):
            if not subs['data']['url']:
              continue
            path = urlparse.urlparse(subs['data']['url']).path
            ext = os.path.splitext(path)[1]
            print ext
            if not ext or ext == ".gif":
              continue

            try:
              image = urlfetch.Fetch(subs['data']['url']).content
              img = images.Image(image)
              img.im_feeling_lucky()
              png_data = img
              png_data = img.execute_transforms(images.PNG)
              temp = subs['data']['title']
              temp = temp.replace("\"", "\'")
              print "put"
            except Exception,e:
              print e
            self.redirect('/')

def main():
  url_map = [
             ('/delete', FfDelete),
             ('/image/([-\w]+)', FfServeImage),
             ('/', FfSlideshow)]
             
  application = webapp.WSGIApplication(url_map,debug=True)
  wsgiref.handlers.CGIHandler().run(application)

if __name__ == '__main__':
  main()
