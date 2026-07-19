async function fetch(request: Request) {
  return new Response("AS Logistics Solutions LLC worker alive", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export default { fetch };
