import React from "react";
import { ScrollViewStyleReset } from "expo-router/html";

export default function RootHtml({ children }) {
  return React.createElement(
    "html",
    { lang: "en" },
    React.createElement(
      "head",
      null,
      React.createElement("meta", { charSet: "utf-8" }),
      React.createElement("meta", { content: "IE=edge", httpEquiv: "X-UA-Compatible" }),
      React.createElement("meta", {
        content: "width=device-width, initial-scale=1, shrink-to-fit=no",
        name: "viewport",
      }),
      React.createElement(ScrollViewStyleReset),
      React.createElement("script", {
        async: true,
        "data-figma-capture": "true",
        src: "https://mcp.figma.com/mcp/html-to-design/capture.js",
      })
    ),
    React.createElement("body", null, children)
  );
}
