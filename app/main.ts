import * as net from "net";

// get a command line argument from bun
let fileDirectory = process.argv[3];

const server = net.createServer((socket) => {
  socket.on("data", async (data) => {
    const req = data.toString();
    const reqSegments = req.split("\r\n");
    const statusLine = reqSegments[0];
    const body = reqSegments.pop();
    const headers = reqSegments;

    const headersMap = headers.reduce((acc: Map<string, string>, header: string) => {
      const [key, val] = header.split(": ")
      acc.set(key, val);
      return acc;
    }, new Map());

    const [_method, path, _version] = statusLine.split(" ");
    const pathSegments = path.split("/");

    if (path.startsWith("/echo")) {
      /** Echo route
      * GET /echo/<param> */
      const param = pathSegments[2];
      return socket.write("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: " + param.length + "\r\n\r\n" + param);

    } else if (path.startsWith('/files')) {
      if(statusLine.startsWith("POST")) {
        /** File route
        * POST /files/<param> */
        const param = pathSegments[2];
        if(!body) return socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");

        const filePath = `${fileDirectory}/${param}`;
        await Bun.write(filePath, body);

        return socket.write("HTTP/1.1 201 Created\r\n\r\n");
      } else if(statusLine.startsWith("GET")) {
        /** File route
        * GET /files/<param> */
        const param = pathSegments[2];
        const file = Bun.file(`${fileDirectory}/${param}`);

        const fileExists = await file.exists();
        if (!fileExists) return socket.write("HTTP/1.1 404 Not Found\r\n\r\n");

        const fileContent = await file.text();
        return socket.write("HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: " + fileContent.length + "\r\n\r\n" + fileContent);
      }
    } else if (path === '/user-agent') {
      /** User agent route
      * GET /user-agent */
      const param = headersMap.get("User-Agent");
      if (!param) return socket.write("HTTP/1.1 500 Server Error\r\n\r\n");
      return socket.write("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: " + param.length + "\r\n\r\n" + param);
    } else if (path === '/') {
      /** Index route
      * GET / */
      return socket.write("HTTP/1.1 200 OK\r\n\r\n");
    } else {
      return socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    }
  })
  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");
