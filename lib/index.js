"use strict";

module.exports = {
  hooks: {
    "page:before": (page) => {
      console.log(page);
      return page;
    }
  },
  blocks: {
    dspdoc: {
      process: (block) => {
        console.log(block);
      }
    }
  }
};
