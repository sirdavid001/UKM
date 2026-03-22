#!/usr/bin/env node

const net = require("net");
const { spawn, spawnSync } = require("child_process");

function findOpenPort(startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = net.createServer();

      server.once("error", (error) => {
        if (error.code === "EADDRINUSE") {
          tryPort(port + 1);
          return;
        }

        reject(error);
      });

      server.once("listening", () => {
        server.close(() => resolve(port));
      });

      server.listen({ port, exclusive: true });
    };

    tryPort(startPort);
  });
}

function execCapture(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });

  if (result.status !== 0) {
    const message = result.stderr?.trim() || result.stdout?.trim() || `${command} failed`;
    throw new Error(message);
  }

  return result.stdout;
}

function getDevicesJson() {
  const output = execCapture("xcrun", ["simctl", "list", "devices", "available", "-j"]);
  return JSON.parse(output);
}

function pickSimulator(devicesJson) {
  const runtimes = Object.values(devicesJson.devices || {});
  const devices = runtimes.flat();

  const booted = devices.find((device) => device.isAvailable && device.state === "Booted");
  if (booted) {
    return booted;
  }

  const iphone = devices.find((device) => device.isAvailable && /iPhone/i.test(device.name));
  if (iphone) {
    return iphone;
  }

  const first = devices.find((device) => device.isAvailable);
  if (!first) {
    throw new Error("No available iOS simulators found.");
  }

  return first;
}

function ensureSimulatorBooted(device) {
  spawnSync("open", ["-a", "Simulator"], { stdio: "ignore" });

  if (device.state !== "Booted") {
    const bootResult = spawnSync("xcrun", ["simctl", "boot", device.udid], { encoding: "utf8" });
    if (bootResult.status !== 0 && !/Unable to boot device in current state: Booted/i.test(bootResult.stderr || "")) {
      throw new Error(bootResult.stderr?.trim() || bootResult.stdout?.trim() || "Failed to boot simulator.");
    }
  }

  const statusResult = spawnSync("xcrun", ["simctl", "bootstatus", device.udid, "-b"], { encoding: "utf8" });
  if (statusResult.status !== 0) {
    throw new Error(statusResult.stderr?.trim() || statusResult.stdout?.trim() || "Simulator failed to boot.");
  }
}

function openExpoUrl(device, url) {
  const result = spawnSync("xcrun", ["simctl", "openurl", device.udid, url], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || `Failed to open ${url}`);
  }
}

function runExpo(device, port) {
  process.stdout.write(`Starting Expo on port ${port}\n`);

  const child = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["expo", "start", "--port", String(port)],
    {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    }
  );

  let opened = false;
  let combinedOutput = "";

  const forward = (stream, target) => {
    let buffer = "";

    stream.on("data", (chunk) => {
      const text = chunk.toString();
      combinedOutput += text;
      if (combinedOutput.length > 16000) {
        combinedOutput = combinedOutput.slice(-16000);
      }
      buffer += text;
      target.write(text);

      if (opened) {
        return;
      }

      const match = buffer.match(/exp:\/\/[^\s]+/);
      const localhostMatch = buffer.match(/Waiting on http:\/\/localhost:(\d+)/);
      const url = match ? match[0] : localhostMatch ? `exp://127.0.0.1:${localhostMatch[1]}` : null;
      if (!url) {
        if (buffer.length > 4096) {
          buffer = buffer.slice(-4096);
        }
        return;
      }

      opened = true;
      try {
        openExpoUrl(device, url);
        process.stdout.write(`\nOpened ${url} on ${device.name}\n`);
      } catch (error) {
        process.stderr.write(`${error.message}\n`);
      }
    });
  };

  return new Promise((resolve, reject) => {
    forward(child.stdout, process.stdout);
    forward(child.stderr, process.stderr);

    if (process.stdin.isTTY) {
      process.stdin.setRawMode?.(false);
    }

    process.stdin.pipe(child.stdin);

    child.on("exit", (code, signal) => {
      process.stdin.unpipe(child.stdin);
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      const suggestedPortMatch = combinedOutput.match(/Use port (\d+) instead\?/i);
      if ((code ?? 0) !== 0 && suggestedPortMatch) {
        resolve({ retryPort: Number(suggestedPortMatch[1]) });
        return;
      }

      if ((code ?? 0) === 0) {
        resolve({ done: true });
        return;
      }

      reject(new Error(`Expo exited with code ${code ?? 0}.`));
    });
  });
}

async function main() {
  let port = await findOpenPort(8081);
  const device = pickSimulator(getDevicesJson());
  ensureSimulatorBooted(device);

  process.stdout.write(`Using iOS simulator: ${device.name}\n`);

  while (true) {
    const result = await runExpo(device, port);
    if (result.done) {
      return;
    }

    port = result.retryPort;
    process.stdout.write(`Retrying Expo on port ${port}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
