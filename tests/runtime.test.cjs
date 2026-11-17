const test = require('node:test');
const assert = require('node:assert/strict');
const {contracts, scenarios, initialState, transition} = require('../src/assets/home.js');

test('normal delivery accepts the specific artifact only after the contract stage', () => {
  const frames = scenarios.normal;
  const pending = frames.find(frame => frame.record.review === 'pending');
  const accepted = frames.at(-1).record;
  assert.ok(pending);
  assert.equal(accepted.run_status, 'completed');
  assert.equal(accepted.artifact, pending.record.artifact);
  assert.deepEqual(accepted.review.reviewed_artifact_ids, [accepted.artifact]);
});

test('rework keeps the old identity and requires a new acceptance for the revised artifact', () => {
  const frames = scenarios.repair;
  const rejected = frames.find(frame => frame.record.review?.passed === false).record;
  const revised = frames.find(frame => frame.record.generation === 2 && frame.record.review === 'pending').record;
  const accepted = frames.at(-1).record;
  assert.equal(revised.previous_artifact, rejected.artifact);
  assert.notEqual(revised.artifact, rejected.artifact);
  assert.equal(accepted.generation, revised.generation);
  assert.deepEqual(accepted.review.reviewed_artifact_ids, [revised.artifact]);
});

test('an unknown paid result stays held with unknown usage and is never illustrated as replayed', () => {
  const record = scenarios.unknown.at(-1).record;
  assert.equal(record.request.status, 'unknown');
  assert.equal(record.work_item, 'interrupted');
  assert.equal(record.accounting.state, 'held');
  assert.equal(record.accounting.settled_points, null);
  assert.equal(record.automatic_replay, false);
  assert.ok(!scenarios.unknown.some(frame => frame.record.run_status === 'completed'));
});

test('changing scenario resets progress and navigation remains bounded at both ends', () => {
  let state = initialState();
  state = transition(state, {type: 'previous'});
  assert.equal(state.index, 0);
  state = transition(state, {type: 'select', index: 999});
  assert.equal(state.index, scenarios.normal.length - 1);
  state = transition(state, {type: 'scenario', value: 'unknown'});
  assert.deepEqual(state, {scenario: 'unknown', index: 0});
  state = transition(state, {type: 'select', index: 999});
  assert.equal(transition(state, {type: 'next'}).index, scenarios.unknown.length - 1);
});

test('author declarations use capability slots and the install body binds the local model separately', () => {
  const declaration = contracts.definition.value;
  assert.equal(declaration.model, 'reasoning');
  assert.equal(declaration.crew.process, 'sequential');
  assert.ok(declaration.crew.members.every(member => !Object.hasOwn(member, 'model_id')));
  assert.deepEqual(contracts.binding.value, {bindings: {models: {reasoning: 'local-text-profile'}}});
});
