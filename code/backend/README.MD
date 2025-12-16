# Colocar a funcionar el backend

## 1. Crear entorno virtual

```
python -m venv venv
```

```
venv\Scripts\activate
```

```
pip install -r requirements.txt
```

Para refrescar requirements

```
pip freeze > requirements.txt
```

Correr el proyecto

```
python app.py
```



## 2. Montar tunel para que el esp pueda escuchar las apis

```
cloudflared tunnel --url http://localhost:5000     
```

Luego de que **cloudflared** entregue la ruta, toca ajustarlo en el ESP.