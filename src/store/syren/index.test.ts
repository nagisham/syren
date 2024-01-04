import { describe, test, assert } from 'vitest';

import {
  state_engine,
  in_memory_state_behaviour,
  local_storage_state_behaviour,
  default_value_state_behaviour,
} from './implementation';

describe('test state builder', () => {
  describe('test in memory state', () => {
    const state = state_engine({
      behaviours: [in_memory_state_behaviour<number>()],
    });

    test('test initial value', () => {
      const value = state.get.run();
      assert.equal(value, undefined);
    });

    test('test state change', () => {
      state.set.run(1);
      const value = state.get.run();
      assert.equal(value, 1);
    });
  });

  describe('test local storage as main', () => {
    test('test initial value', () => {
      const state = state_engine({
        behaviours: [local_storage_state_behaviour<number>('count_1')],
      });

      const value = state.get.run();
      assert.equal(value, undefined);
    });

    test('test state change', () => {
      const state = state_engine({
        behaviours: [local_storage_state_behaviour<number>('count_1')],
      });

      state.set.run(1);

      const value = state.get.run();
      assert.equal(value, 1);
    });

    test('test value persist', () => {
      const state = state_engine({
        behaviours: [local_storage_state_behaviour<number>('count_1')],
      });

      const value = state.get.run();
      assert.equal(value, 1);
    });
  });

  describe('test default value behaviour', () => {
    test('test default value', () => {
      const state = state_engine({
        behaviours: [default_value_state_behaviour(0)],
      });

      const value = state.get.run();
      assert.equal(value, 0);
    });
  });

  describe('test two sources of state', () => {
    test('test default value', () => {
      const state = state_engine({
        behaviours: [
          in_memory_state_behaviour<number>(),
          local_storage_state_behaviour<number>('count_2'),
          default_value_state_behaviour(0),
        ],
      });

      const value = state.get.run();
      assert.equal(value, 0);
    });

    test('test setting value', () => {
      const state = state_engine({
        behaviours: [
          in_memory_state_behaviour<number>(),
          local_storage_state_behaviour<number>('count_2'),
          default_value_state_behaviour(0),
        ],
      });

      state.set.run(1);

      const value = state.get.run();
      assert.equal(value, 1);
    });

    test('test the value persist in local storage', () => {
      const state = state_engine({
        behaviours: [
          in_memory_state_behaviour<number>(),
          local_storage_state_behaviour<number>('count_2'),
          default_value_state_behaviour(0),
        ],
      });

      const value = state.get.run();
      assert.equal(value, 1);
    });
  });
});
