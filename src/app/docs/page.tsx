"use client";

import { useEffect, useRef } from "react";

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js";
    script.onload = () => {
      // @ts-expect-error SwaggerUIBundle is loaded from CDN
      window.SwaggerUIBundle({
        url: "/api/docs",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [
          // @ts-expect-error SwaggerUIBundle is loaded from CDN
          window.SwaggerUIBundle.presets.apis,
        ],
        layout: "BaseLayout",
      });
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-dvh bg-white">
      <div id="swagger-ui" ref={containerRef} />
    </div>
  );
}
