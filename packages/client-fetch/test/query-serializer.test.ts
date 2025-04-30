import { describe, expect, it } from 'vitest';

import { createClient } from '../src';

describe('Query serialization', () => {
  it('should handle nested objects with qs serializer (default)', () => {
    const client = createClient();

    // Create a complex nested object
    const complexQuery = {
      filter: {
        details: {
          active: true,
          score: 42,
        },
        name: 'test',
      },
      page: 1,
      size: 10,
      sort: ['createdAt', 'name'],
    };

    // This would throw an error without qs serializer
    const url = client.buildUrl({
      query: complexQuery,
      url: '/api/items',
    });

    // URL encoded format, brackets are encoded as %5B and %5D
    expect(url).toContain('filter%5Bname%5D=test');
    expect(url).toContain('filter%5Bdetails%5D%5Bactive%5D=true');
    expect(url).toContain('filter%5Bdetails%5D%5Bscore%5D=42');
    expect(url).toContain('sort%5B');
    expect(url).toContain('page=1');
    expect(url).toContain('size=10');
  });

  it('should use default serializer when useQsSerializer is set to false', () => {
    const client = createClient();

    // Using non-nested query parameters
    const simpleQuery = {
      active: true,
      name: 'test',
      tags: ['tag1', 'tag2'],
    };

    const url = client.buildUrl({
      query: simpleQuery,
      url: '/api/items',
      useQsSerializer: false,
    });

    // Default serializer uses different format
    expect(url).toContain('name=test');
    expect(url).toContain('active=true');
    expect(url).toMatch(/tags=tag1&tags=tag2/); // Exploded form style
  });

  it('should throw an error for deeply nested objects with default serializer', () => {
    const client = createClient();

    // Create a complex nested object
    const complexQuery = {
      filter: {
        details: {
          active: true,
        },
      },
    };

    // This should throw an error when using the default serializer
    expect(() =>
      client.buildUrl({
        query: complexQuery,
        url: '/api/items',
        useQsSerializer: false,
      }),
    ).toThrow(
      'Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these.',
    );
  });

  it('should apply custom qs serializer options', () => {
    const client = createClient();

    const query = {
      tags: ['tag1', 'tag2', 'tag3'],
    };

    // Test with custom array format
    const url = client.buildUrl({
      query,
      querySerializerOptions: {
        array: {
          explode: false,
          style: 'pipeDelimited',
        },
      },
      url: '/api/items',
    });

    // Should use format closer to pipe delimited (qs doesn't support exactly the same formats)
    expect(url).toContain('tags=tag1%2Ctag2%2Ctag3');
  });
});
