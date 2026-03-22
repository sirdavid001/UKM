#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);

if (args.length === 0) {
  process.stderr.write("Usage: node scripts/with-native-tools.js <command> [...args]\n");
  process.exit(1);
}

const home = process.env.HOME || process.env.USERPROFILE || "";
const rubyRoot = path.join(home, ".local", "portable-ruby", "4.0.1");
const gemHome = path.join(home, ".local", "portable-ruby-gems");
const extraPaths = [
  path.join(rubyRoot, "bin"),
  path.join(gemHome, "bin"),
];
const utf8Locale = /utf-?8/i.test(process.env.LANG || "") ? process.env.LANG : "en_US.UTF-8";
const rubyOpt = [process.env.RUBYOPT, "-EUTF-8:UTF-8"].filter(Boolean).join(" ");

const child = spawn(args[0], args.slice(1), {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    PATH: `${extraPaths.join(path.delimiter)}${path.delimiter}${process.env.PATH || ""}`,
    GEM_HOME: gemHome,
    GEM_PATH: [gemHome, process.env.GEM_PATH].filter(Boolean).join(path.delimiter),
    LANG: utf8Locale,
    LC_ALL: /utf-?8/i.test(process.env.LC_ALL || "") ? process.env.LC_ALL : utf8Locale,
    LC_CTYPE: /utf-?8/i.test(process.env.LC_CTYPE || "") ? process.env.LC_CTYPE : utf8Locale,
    RUBYOPT: rubyOpt,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
