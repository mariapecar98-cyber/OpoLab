declare module '*.csv?raw' {
  const content: string
  export default content
}
declare module 'mammoth/mammoth.browser' {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>
}
