import { MindNode } from './types'

const gid = () => `n${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export interface ParseResult {
  nodes: Record<string, MindNode>
  rootId: string
  nodeCount: number
}

// Strip common inline markdown: **bold**, *italic*, `code`, [text](url)
function cleanTitle(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim()
}

function makeNode(id: string, title: string, parentId: string | null): MindNode {
  return { id, title: cleanTitle(title), description: '', type: '', priority: null, children: [], parentId }
}

// Wrap multiple top-level nodes under a single virtual root
function wrapRoots(nodes: Record<string, MindNode>, topIds: string[], wrapTitle: string): { nodes: Record<string, MindNode>; rootId: string } {
  const rootId = gid()
  const root = makeNode(rootId, wrapTitle, null)
  root.children = topIds
  const result = { ...nodes, [rootId]: root }
  for (const id of topIds) result[id] = { ...result[id], parentId: rootId }
  return { nodes: result, rootId }
}

function parseHeadings(lines: string[]): { nodes: Record<string, MindNode>; topIds: string[] } {
  const allNodes: Record<string, MindNode> = {}
  const stack: { id: string; depth: number }[] = []
  const topIds: string[] = []

  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+)$/)
    if (!m) continue
    const depth = m[1].length
    const title = m[2]
    const id = gid()

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop()

    const parentId = stack.length > 0 ? stack[stack.length - 1].id : null
    allNodes[id] = makeNode(id, title, parentId)

    if (parentId) {
      allNodes[parentId].children.push(id)
    } else {
      topIds.push(id)
    }
    stack.push({ id, depth })
  }

  return { nodes: allNodes, topIds }
}

function parseList(lines: string[]): { nodes: Record<string, MindNode>; topIds: string[] } {
  const allNodes: Record<string, MindNode> = {}
  const stack: { id: string; indent: number }[] = []
  const topIds: string[] = []

  for (const rawLine of lines) {
    const m = rawLine.match(/^([ \t]*)[-*+]\s+(.+)$/)
    if (!m) continue
    // Normalize: tab = 2 spaces
    const indent = m[1].replace(/\t/g, '  ').length
    const title = m[2]
    const id = gid()

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop()

    const parentId = stack.length > 0 ? stack[stack.length - 1].id : null
    allNodes[id] = makeNode(id, title, parentId)

    if (parentId) {
      allNodes[parentId].children.push(id)
    } else {
      topIds.push(id)
    }
    stack.push({ id, indent })
  }

  return { nodes: allNodes, topIds }
}

// Convert a JSON object into a node tree. String values become leaf nodes (long ones go into description),
// array values become parent nodes with children for each string item.
function parseJsonToNodes(
  jsonStr: string,
  parentId: string | null,
): { nodes: Record<string, MindNode>; topIds: string[] } | null {
  let obj: unknown
  try {
    obj = JSON.parse(jsonStr)
  } catch {
    return null
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return null

  const allNodes: Record<string, MindNode> = {}
  const topIds: string[] = []

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value === null || value === undefined) continue

    const nodeId = gid()

    if (Array.isArray(value)) {
      allNodes[nodeId] = makeNode(nodeId, key, parentId)
      topIds.push(nodeId)
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) {
          const childId = gid()
          allNodes[childId] = makeNode(childId, item, nodeId)
          allNodes[nodeId].children.push(childId)
        }
      }
    } else if (typeof value === 'string' && value.trim()) {
      allNodes[nodeId] = makeNode(nodeId, key, parentId)
      // Long strings go into description, short strings appended to title
      if (value.length <= 40) {
        allNodes[nodeId].title = `${key}：${value}`
      } else {
        allNodes[nodeId].description = value
      }
      topIds.push(nodeId)
    }
    // Skip number, boolean, nested object values
  }

  return topIds.length > 0 ? { nodes: allNodes, topIds } : null
}

export function parseMarkdownToNodes(content: string, fileName: string): ParseResult | null {
  let inCodeBlock = false
  let codeBlockContent = ''
  const codeBlocks: string[] = []

  const lines = content.split('\n').filter(raw => {
    const trimmed = raw.trim()
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeBlockContent = ''
      } else {
        inCodeBlock = false
        codeBlocks.push(codeBlockContent)
      }
      return false
    }
    if (inCodeBlock) { codeBlockContent += raw + '\n'; return false }
    if (!trimmed || trimmed === '---' || trimmed === '***') return false
    return true
  })

  const mapTitle = fileName.replace(/\.md$/i, '')

  const isHeading = lines.some(l => /^#{1,6}\s/.test(l))
  const { nodes, topIds } = isHeading ? parseHeadings(lines) : parseList(lines)

  // If we parsed ≤1 outline nodes but found code blocks, try JSON parsing
  if (topIds.length <= 1 && codeBlocks.length > 0) {
    for (const block of codeBlocks) {
      const headingRootId = topIds.length === 1 ? topIds[0] : null
      const jsonResult = parseJsonToNodes(block.trim(), headingRootId)
      if (jsonResult && jsonResult.topIds.length > 1) {
        const allNodes = { ...nodes, ...jsonResult.nodes }

        if (headingRootId) {
          // Attach JSON nodes as children of the heading root
          allNodes[headingRootId] = { ...allNodes[headingRootId], children: jsonResult.topIds }
          return { nodes: allNodes, rootId: headingRootId, nodeCount: Object.keys(allNodes).length }
        } else {
          const { nodes: finalNodes, rootId } = wrapRoots(jsonResult.nodes, jsonResult.topIds, mapTitle)
          return { nodes: finalNodes, rootId, nodeCount: Object.keys(finalNodes).length }
        }
      }
    }
  }

  if (topIds.length === 0) return null

  // Single root: use it directly; multiple: wrap under file name
  const { nodes: finalNodes, rootId } =
    topIds.length === 1
      ? { nodes, rootId: topIds[0] }
      : wrapRoots(nodes, topIds, mapTitle)

  return { nodes: finalNodes, rootId, nodeCount: Object.keys(finalNodes).length }
}
