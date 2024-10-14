// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import { ControlFlowCommandNames } from '../../playback-tree/commands'
import {
  CommandExecutionResult,
  CommandNode,
} from '../../playback-tree/command-node'
import Variables from '../../variables'
import FakeExecutor from '../util/FakeExecutor'

describe('Command Node', () => {
  let variables: Variables
  beforeEach(() => {
    variables = new Variables()
  })
  it('control flow check returns correct result', () => {
    let node = new CommandNode(undefined as unknown as any)
    // @ts-expect-error
    node.right = 'asdf'
    expect(node.isControlFlow()).toBeTruthy()
    node.left = undefined
    // @ts-expect-error
    node.right = 'asdf'
    expect(node.isControlFlow()).toBeTruthy()
  })
  it('retry limit defaults to 1000', () => {
    const command = {
      id: 'a',
      command: ControlFlowCommandNames.times,
      target: '',
      value: '',
    }
    const node = new CommandNode(command)
    node.timesVisited = 999
    expect(node._isRetryLimit()).toBeFalsy()
    node.timesVisited = 1000
    expect(node._isRetryLimit()).toBeTruthy()
  })
  it('retry limit can be overriden', () => {
    const command = {
      id: 'a',
      command: ControlFlowCommandNames.repeatIf,
      target: '',
      value: '5',
    }
    const node = new CommandNode(command)
    node.timesVisited = 5
    expect(node._isRetryLimit()).toBeTruthy()
  })
  it('forEach fetches count from preset variable', () => {
    const collectionName = 'blah'
    variables.set(collectionName, [
      { a: 'a1', b: 'b1' },
      { a: 'a2', b: 'b2' },
    ])
    const command = {
      id: 'a',
      command: ControlFlowCommandNames.forEach,
      target: collectionName,
      value: 'iteratorVar',
    }
    const node = new CommandNode(command)
    expect(node.evaluateForEach(variables)).toEqual(true)
  })
  it('forEach errors without a valid variable', () => {
    const command = {
      id: 'a',
      command: ControlFlowCommandNames.forEach,
      target: 'asdf',
      value: '',
    }
    const node = new CommandNode(command)
    const result = node.evaluateForEach(variables)
    expect(result).toEqual('Invalid variable provided.')
  })
  it('forEach stores iterated collection entry on a variable using the provided name', () => {
    const collectionName = 'asdf'
    variables.set(collectionName, [
      { a: 'a1', b: 'b1' },
      { a: 'a2', b: 'b2' },
    ])
    const command = {
      id: 'a',
      command: ControlFlowCommandNames.forEach,
      target: collectionName,
      value: 'iteratorVar',
    }
    const node = new CommandNode(command)
    node.evaluateForEach(variables)
    expect(variables.get('iteratorVar')).toEqual({ a: 'a1', b: 'b1' })
  })
  it('forEach resets timesVisited after completing', () => {
    const collection = { name: 'asdf', value: [{ a: 'a' }, { b: 'b' }] }
    variables.set(collection.name, collection.value)
    const node = new CommandNode({
      id: 'a',
      command: ControlFlowCommandNames.forEach,
      target: collection.name,
      value: 'iteratorVar',
    })
    node.timesVisited = collection.value.length + 1
    node.evaluateForEach(variables)
    expect(node.timesVisited).toEqual(-1)
  })
  it('execute resolves with an error message when too many retries attempted in a loop', () => {
    const command = {
      id: 'a',
      command: ControlFlowCommandNames.while,
      target: '',
      value: '2',
    }
    // const executor = new FakeExecutor()
    const node = new CommandNode(command)
    node.timesVisited = 3
    // return node.execute(executor as unknown as any).catch((err) => {
    //   expect(err.message).toEqual(
    //     'Max retry limit exceeded. To override it, specify a new limit in the value input field.'
    //   )
    // })
  })
  it("evaluate resolves with an error message on 'times' when an invalid number is provided", async () => {
    const command = {
      id: 'a',
      command: ControlFlowCommandNames.times,
      target: 'asdf',
      value: '',
    }
    const executor = new FakeExecutor()
    executor.init({ variables: new Variables() })
    const node = new CommandNode(command)
    try {
      await node._evaluate(executor as unknown as any)
    } catch (err) {
      expect((err as Error).message).toEqual(
        'Invalid number provided as a target.'
      )
    }
  })
  it('timesVisited only increments for control flow commands', () => {
    let command = {
      id: 'a',
      command: ControlFlowCommandNames.times,
      target: '',
      value: '',
    }
    let node = new CommandNode(command)
    expect(node.timesVisited).toBe(0)
    node._incrementTimesVisited()
    expect(node.timesVisited).toBe(1)
    const nextCommand = {
      id: 'a',
      command: 'command',
      target: '',
      value: '',
    }
    node = new CommandNode(nextCommand)
    expect(node.timesVisited).toBe(0)
    node._incrementTimesVisited()
    expect(node.timesVisited).toBe(0)
  })
  it("evaluationResult returns the 'right' node on true", () => {
    const command = {
      id: 'a',
      command: 'a',
      target: '',
      value: '',
    }
    const node = new CommandNode(command)
    // @ts-expect-error
    node.right = 'b'
    // @ts-expect-error
    node.left = 'c'
    const result = node._evaluationResult({ value: true })
    expect(result.next).toEqual('b')
  })
  it("evaluationResult returns the 'left' node on false", () => {
    const command = {
      id: 'a',
      command: 'a',
      target: '',
      value: '',
    }
    const node = new CommandNode(command)
    // @ts-expect-error
    node.right = 'b'
    // @ts-expect-error
    node.left = 'c'
    const result = node._evaluationResult({ value: false })
    expect(result.next).toEqual('c')
  })
  it("executionResult returns the 'next' node on non-controlflow commands", () => {
    const command = {
      id: 'a',
      command: 'open',
      target: '',
      value: '',
    }
    let nodeA = new CommandNode(command)
    const nodeB = new CommandNode(command)
    nodeA.next = nodeB
    expect(nodeA._executionResult().next).toEqual(nodeB)
  })
  it("executionResult returns a 'next' node on control flow", () => {
    const command = {
      id: 'a',
      command: ControlFlowCommandNames.if,
      target: '',
      value: '',
    }
    let nodeA = new CommandNode(command)
    // @ts-expect-error
    nodeA.left = 'asdf'
    const nodeB = new CommandNode(command)
    const result: CommandExecutionResult = {
      next: nodeB,
    }
    expect(nodeA._executionResult(result).next).toEqual(nodeB)
  })
})
