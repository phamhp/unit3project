from flask import Flask 
from flask import render_template
app = Flask(__name__) 
  
@app.route("/") 
def home_view(): 
    return "<h1>Welcome to Geeks for Geeks</h1>"

@app.route("/launch")
def launch():
    return render_template("launch.html")

@app.route("/health")
def health():
    return render_template('health.html')

@app.route("/index")
def index():
    return render_template('index.html')

