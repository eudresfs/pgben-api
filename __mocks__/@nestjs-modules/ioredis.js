class RedisService {
  // simplistic getOrThrow returning dummy redis client with jest fns when under test
  getOrThrow() {
    return {
      eval: jest.fn(),
      hgetall: jest.fn(),
      keys: jest.fn(),
      pipeline: jest.fn(() => ({
        hincrby: jest.fn().mockReturnThis(),
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      })),
      del: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
      get: jest.fn(),
    };
  }
}
module.exports = { RedisService };
