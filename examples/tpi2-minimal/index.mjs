const sdk = globalThis.__tianshuTPI;
if (sdk?.version !== '2.0' || typeof sdk.defineTianshuPlugin !== 'function') {
  throw new Error('此示例需要支持 TPI 2.0 的天枢隔离宿主。');
}

export default sdk.defineTianshuPlugin({
  id: 'example-text-count',
  activate() {
    return {
      tools: [{
        name: 'example_count_text',
        description: '统计输入文字的 Unicode 码点数量。',
        inputSchema: {
          type: 'object',
          properties: { text: { type: 'string' } },
          required: ['text'],
          additionalProperties: false,
        },
        async execute({ args }) {
          if (typeof args.text !== 'string') return { content: 'text 必须是字符串', isError: true };
          return { content: String(Array.from(args.text).length) };
        },
      }],
    };
  },
});
