#!/usr/bin/env node

// Import built-in Node.js modules
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { execSync } from 'node:child_process';
import readline from 'node:readline';
import chalk from 'chalk'; // For colorful CLI output

// Get the port number from command line arguments
const port = process.argv[2];
if (!port) {
    console.error(chalk.red("Usage: port-checker <port>"));
    process.exit(1);
}

// Check if a port is open by attempting a TCP connection
function checkPort(port, callback) {
    const socket = new net.Socket();
    socket.setTimeout(2000);

    socket.on('connect', function () {
        socket.destroy();
        callback(true); // Port is open
    }).on('error', function () {
        callback(false); // Port is closed or unreachable
    }).on('timeout', function () {
        socket.destroy();
        callback(false); // Connection timed out
    }).connect(port, '127.0.0.1');
}

// Try making an HTTP or HTTPS request to the port to see if it's serving web content
function tryHttp(port) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: port,
            path: '/',
            method: 'GET',
            headers: {
                'Host': 'localhost',
                'User-Agent': 'port-checker'
            }
        };

        // Nested function to try HTTPS first, then fallback to HTTP
        const tryHttpRequest = (proto, label) => {
            const req = proto.request(options, (res) => {
                console.log(chalk.magenta.bold('\n🌐  HTTP(S) Response:'));
                console.log(`    Protocol: ${chalk.cyan(label)}`);
                console.log(`    Status: ${chalk.yellow(res.statusCode + ' ' + res.statusMessage)}`);
                resolve(label); // Identify as HTTP or HTTPS
            });

            req.on('error', (err) => {
                // If HTTPS fails, try HTTP as a fallback
                if (proto === https) {
                    tryHttpRequest(http, 'HTTP');
                } else {
                    console.log(chalk.magenta.bold('\n🌐  HTTP(S) Response:'));
                    // Special handling for handshake failure
                    if ((port === '443' || port === '8243') && err.message.includes('socket hang up')) {
                        console.log(`    ${chalk.yellow('Protocol: HTTPS (handshake failed)')}`);
                        resolve('HTTPS (handshake failed)');
                    } else {
                        console.log(`    ${chalk.red('Both HTTP and HTTPS failed:')} ${err.message}`);
                        resolve(null);
                    }
                }
            });

            req.end();
        };

        tryHttpRequest(https, 'HTTPS');
    });
}

// Identify protocols based on banner info (from raw TCP data)
function identifyProtocolFromBanner(banner, port) {
    if (banner.startsWith('AMQP')) return 'AMQP (JMS)';
    if (banner.includes('HTTP')) return 'HTTP';
    if (banner.includes('caching_sha2_password') || banner.includes('mysql_native_password')) {
        const versionMatch = banner.match(/\d+\.\d+\.\d+/);
        const version = versionMatch ? versionMatch[0] : 'Unknown';
        return `MySQL (version: ${version})`;
    }
    if (port === '9615') return 'TCP'; // e.g., Prometheus exporter port
    return `Unknown (banner: ${banner.trim()})`;
}

// Attempt to identify service running on the port using banner grabbing
async function detectProtocol(port, host = '127.0.0.1') {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let resolved = false;

        const cleanup = (result) => {
            if (!resolved) {
                resolved = true;
                resolve(result);
                socket.destroy();
            }
        };

        socket.setTimeout(3000, () => cleanup(port === '9615' ? 'TCP' : 'Timeout'));
        socket.on('error', () => cleanup(port === '9615' ? 'TCP' : 'No response'));

        socket.connect(port, host, () => {
            // Send a sample AMQP handshake to check for AMQP responses
            socket.write('AMQP\x00\x01\x00\x00', 'binary');
            socket.once('data', (data) => {
                const banner = data.toString('ascii');
                const identified = identifyProtocolFromBanner(banner, port);
                cleanup(identified);
            });
        });
    });
}

// Prompt the user to terminate the process bound to the port
function promptToKillProcess(pid) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(`\n⚠️  Do you want to kill process ${pid}? (y/n): `, (answer) => {
            if (answer.toLowerCase() === 'y') {
                try {
                    process.kill(pid);
                    console.log(chalk.redBright(`✅ Process ${pid} terminated.`));
                } catch (err) {
                    console.log(chalk.red(`❌ Failed to kill process ${pid}: ${err.message}`));
                }
            } else {
                console.log(chalk.yellow('ℹ️  Process was not terminated.'));
            }
            rl.close();
            resolve();
        });
    });
}

// Retrieve the process using the given port using `lsof`
async function getProcessUsingPort(port) {
    try {
        const output = execSync(`lsof -i :${port} | grep LISTEN`).toString().split('\n')[0];

        if (output) {
            const parts = output.trim().split(/\s+/);
            const processName = parts[0];
            const pid = parts[1];
            const portInfo = parts.slice(-1)[0];

            console.log(chalk.cyan.bold('\n🧩  Bound Process:'));
            console.log(`    ${chalk.yellow(`${processName} (pid: ${pid})`)}`);
            console.log(`    Command: Listening on ${portInfo}`);

            await promptToKillProcess(pid);
            return pid;
        }
    } catch (err) {
        console.log(chalk.cyan.bold('\n🧩  Bound Process:'));
        console.log(chalk.gray(`    Unable to determine bound process. Try running:`));
        console.log(chalk.gray(`    sudo port-checker ${port}`));
    }
    return null;
}

// Entry point: Check if the port is open, identify the service, and optionally kill it
checkPort(port, async (isOpen) => {
    if (isOpen) {
        console.log(chalk.green.bold('┌─────────────────────────────────────┐'));
        console.log(chalk.green.bold(`│ ✅  Port ${port} is OPEN               │`));
        console.log(chalk.green.bold('└─────────────────────────────────────┘'));

        const httpResult = await tryHttp(port);              // Try HTTP(S)
        const pid = await getProcessUsingPort(port);         // Check which process is bound
        const protocol = httpResult && httpResult.startsWith('HTTP')
            ? httpResult
            : await detectProtocol(port);                    // Fallback to raw protocol detection

        // Show final summary
        console.log(chalk.blue.bold('\n📋  Summary:'));
        console.log(`    Port: ${chalk.cyan(port)}`);
        console.log(`    Protocol: ${chalk.cyan(protocol)}`);
        if (pid) console.log(`    PID: ${chalk.cyan(pid)}`);
        console.log(`    Status: ${chalk.green('Open')}`);

        process.exit(0);
    } else {
        console.log(chalk.red.bold(`❌ Port ${port} is closed.`));
        process.exit(0);
    }
});
