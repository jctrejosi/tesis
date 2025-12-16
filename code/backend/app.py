from flask import Flask, request, jsonify

app = Flask(__name__)

led_state = "off"

@app.route("/api/led/on", methods=["GET"])
def led_on():
    global led_state
    led_state = "on"
    return jsonify(status="on")

@app.route("/api/led/off", methods=["GET"])
def led_off():
    global led_state
    led_state = "off"
    return jsonify(status="off")

@app.route("/api/led/status", methods=["GET"])
def led_status():
    return jsonify(status=led_state)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
