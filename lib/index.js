"use strict";

let fs = require("fs");
let path = require("path");

function getPackage(path) {
  try {
    if (fs.existsSync(path)) {
      try {
        return require(
            path.resolve(
                path,
                "package.json"
            )
        );
      } catch (e) {
        return getPackage(
            path.resolve(
                path,
                ".."
            )
        );
      }
    } else {
      return {};
    }
  } catch (e) {
    return {};
  }
}

module.exports = {
  hooks: {
    "page:before": (page) => {
      let _package = getPackage(path.dirname(page.rawPath));

      let paramRegExp = /([^=]+)=['"]([^'"]+)['"]/i;
      let blockRegExp = /{%\s+templateblock\s+([^}]+)%}([^{]+){%\s+endtemplateblock\s+%}/ig;
      let blocks = page.content.match(blockRegExp);
      if (blocks) {
        for (let block of blocks) {

          let _block = blockRegExp.exec(block);
          if (!_block) {
            _block = blockRegExp.exec(block);
          }

          let config = Object.assign(
              {
                body: _block[2].trim()
              },
              _package
          );

          let params = _block[1].trim().split(",");
          for (let param of params) {
            param = paramRegExp.exec(param.trim());
            config[param[1]] = param[2];
          }

          let fullPath = path.resolve(
              path.dirname(page.rawPath),
              config.template
          );

          let template = fs.readFileSync(fullPath, "utf-8");

          template = template.replace(/`/ig, "_-_");

          let keys = template.match(/\$\{([^$}]+)}/ig).map((k) => {
            return k.substring(2, k.length - 1);
          }).sort().filter((value, index, self) => {
            return self.indexOf(value) === index;
          });

          template = (new Function(...keys, "return `" + template + "`;"))(
              ...(keys.map((k) => {
                return config[k] || "";
              }))
          );

          template = template.replace(/_-_/ig, "`");

          page.content = page.content.replace(block, template);
        }
      }
      return page;
    }
  },
  blocks: {
    templateblock: {
      process: () => {
        return '';
      }
    }
  }
};
