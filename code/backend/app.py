from flask import Flask, jsonify
from flask_sock import Sock

app = Flask(__name__)
sock = Sock(app)

clients = set()

@sock.route('/ws')
def ws(ws):
    clients.add(ws)
    try:
        while True:
            ws.receive()  # mantiene conexión viva
    except:
        pass
    finally:
        clients.remove(ws)

@app.route("/led/on")
def led_on():
    for ws in clients:
        ws.send("on")
    return jsonify(state="on")

@app.route("/led/off")
def led_off():
    for ws in clients:
        ws.send("off")
    return jsonify(state="off")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
