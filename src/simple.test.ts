// Simple test to verify Jest is working
describe('Simple Test', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });
  
  it('should handle strings', () => {
    expect('hello').toBe('hello');
  });
});