
const find = require('../../builders/v3/find');
const sort = require('../../builders/v3/sort');
const project = require('../../builders/v3/project');
const limit = require('../../builders/v3/limit');

module.exports = {

  /**
   * Return most recent launch
   */
  latest: async ctx => {
    const data = await global.db
      .collection('launch')
      .find({ upcoming: false })
      .project(project(ctx.request.query))
      .sort({ flight_number: -1 })
      .limit(1)
      .toArray();
    delete data[0].reuse;
    ctx.body = data[0];
  },

  /**
   * Return next launch
   */
  next: async ctx => {
    const data = await global.db
      .collection('launch')
      .find({ upcoming: true })
      .project(project(ctx.request.query))
      .sort({ flight_number: 1 })
      .limit(1)
      .toArray();
    delete data[0].reuse;
    ctx.body = data[0];
  },

  /**
   * Return all past and upcoming launches
   */
  all: async ctx => {
    const data = await global.db
      .collection('launch')
      .find(find(ctx.request))
      .project(project(ctx.request.query))
      .sort(sort(ctx.request))
      .limit(limit(ctx.request.query))
      .toArray();
    data.forEach(launch => {
      delete launch.reuse;
    });
    ctx.body = data;
  },

  /**
   * Return all past launches filtered by querystrings
   */
  past: async ctx => {
    const data = await global.db
      .collection('launch')
      .find(Object.assign({ upcoming: false }, find(ctx.request)))
      .project(project(ctx.request.query))
      .sort(sort(ctx.request))
      .limit(limit(ctx.request.query))
      .toArray();
    data.forEach(launch => {
      delete launch.reuse;
    });
    ctx.body = data;
  },

  /**
   * Return upcoming launches filtered by querystrings
   */
  upcoming: async ctx => {
    const data = await global.db
      .collection('launch')
      .find(Object.assign({ upcoming: true }, find(ctx.request)))
      .project(project(ctx.request.query))
      .sort(sort(ctx.request))
      .limit(limit(ctx.request.query))
      .toArray();
    data.forEach(launch => {
      delete launch.reuse;
    });
    ctx.body = data;
  },

  /**
   * Return one launch from flight number
   */
  one: async ctx => {
    const data = await global.db
      .collection('launch')
      .find({ flight_number: parseInt(ctx.params.flight_number, 10) })
      .project(project(ctx.request.query))
      .toArray();
    if (data.length === 0) {
      ctx.throw(404);
    }
    delete data[0].reuse;
    ctx.body = data[0];
  },
};
