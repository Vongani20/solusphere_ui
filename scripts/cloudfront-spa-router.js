function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.indexOf("/api/") === 0) {
    return request;
  }

  if (uri.lastIndexOf(".") > uri.lastIndexOf("/")) {
    return request;
  }

  request.uri = "/index.html";
  return request;
}
