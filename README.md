# 🔍 Port Checker CLI

A powerful, developer-friendly CLI tool to inspect local TCP ports, detect protocols, and manage processes — all with elegant output and zero setup.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-macos%20%7C%20linux-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)
![Made with Node.js](https://img.shields.io/badge/made%20with-Node.js-brightgreen)

---

## 🚀 Features

- ✅ Detect if a TCP port is open
- 🌐 Auto-detect HTTP, HTTPS, MySQL, AMQP & more
- 🧩 Show the bound process (with optional kill prompt)
- 🧠 Protocol guessing using banner grabbing
- ✨ Developer-friendly, color-coded output
- 🧪 Lightweight and zero-dependency install (except `chalk`)

---

## 📦 Installation

```bash
npm install -g port-checker-cli
```

> Or run directly with `npx` (no install):

```bash
npx port-checker-cli 8080
```

---

## ⚡ Usage

```bash
port-checker <port>
```

#### Example:

```bash
port-checker 3306
```

```
┌─────────────────────────────────────┐
│ ✅  Port 3306 is OPEN               │
└─────────────────────────────────────┘

🌐  HTTP(S) Response:
    Both HTTP and HTTPS failed: Parse Error: Expected HTTP/

🧩  Bound Process:
    Unable to determine bound process. Try running with sudo.

📋  Summary:
    Port: 3306
    Protocol: MySQL (version: 8.2.0)
    Status: Open
```

---

## 🛠 Developer Notes

- If you're checking ports owned by root/system services (like `mysqld`), use `sudo`:
  ```bash
  sudo port-checker 3306
  ```

- Supports graceful exit, no hangs, and handles TCP timeout conditions smoothly.

- Protocol detection includes:
    - HTTP / HTTPS
    - MySQL
    - AMQP (JMS)
    - Custom banners (extensible)

---

## 🔐 Permissions & Security

This tool uses:
- `lsof` or `sudo lsof` to inspect port bindings
- `net.Socket()` for low-level TCP probing
- No external APIs or telemetry

You're in full control. No internet required.

---

## 👨‍💻 Author

**Charith Jayasanka**  
Senior Software Engineer | Dev Tool Enthusiast  
[GitHub](https://github.com/charithg) • [LinkedIn](https://www.linkedin.com/in/charithjayasanka)

---

## 📝 License

MIT © 2025 Charith Jayasanka
