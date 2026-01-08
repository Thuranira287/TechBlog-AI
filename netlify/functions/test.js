// netlify/functions/test.js
exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Function works!" })
  };
};