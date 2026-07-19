import { describe, expect, it } from 'vitest'
import { mapRedditPosts, type RedditListing } from './reddit'
import fixture from '../fixtures/reddit-hot.json'

describe('mapRedditPosts', () => {
  it('mantém posts com flair de notícia/rumor, descarta game threads e stickies', () => {
    const items = mapRedditPosts(fixture as RedditListing)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      source: 'reddit',
      externalId: 'abc1',
      url: 'https://www.reddit.com/r/nba/comments/abc1/charania_star/',
      title: '[Charania] Star guard requests trade',
    })
    expect(items[0].publishedAt).toEqual(new Date(1784112000 * 1000))
  })
})
