"use strict";

let FS = require("fs");
let PATH = require("path");

function getPackage(path) {
  if (FS.existsSync(path)) {
    let _path = PATH.resolve(
        path,
        "package.json"
    );
    if (FS.existsSync(_path)) {
      return require(_path);
    } else {
      return getPackage(
          PATH.resolve(
              path,
              ".."
          )
      );
    }
  } else {
    return {};
  }
}

module.exports = {
  hooks: {
    "page:before": (page) => {
      let _package = getPackage(PATH.dirname(page.rawPath));

      let paramRegExp = /([^=]+)=['"]([^'"]+)['"]/i;
      let blockRegExp = /{%\s+templateblock\s+([^}]+)%}((.|\n)+?){%\s+endtemplateblock\s+%}/ig;
      let blocks = page.content.match(blockRegExp);
      if (blocks) {
        for (let block of blocks) {

          let _block = blockRegExp.exec(block);
          if (!_block) {
            _block = blockRegExp.exec(block);
          }

          let _body = _block[2].trim().split("\n");
          let body = {};
          let part = "body";
          let curentSection = "";
          let regExp = /^\s*-+([a-z0-9\s_]+)-+\s*$/im;
          let match;
          for (let i = 0; i < _body.length; i++) {
            if ((match = regExp.exec(_body[i])) != null) {
              body[part] = curentSection;
              part = match[1].trim();
              curentSection = "";
            } else {
              curentSection += _body[i] + "\r\n";
            }
          }
          body[part] = curentSection;

          let config = Object.assign(
              body,
              _package
          );

          let params = _block[1].trim().split(",");
          for (let param of params) {
            param = paramRegExp.exec(param.trim());
            config[param[1]] = param[2];
          }

          let fullPath = PATH.resolve(
              PATH.dirname(page.rawPath),
              config.template
          );

          let template = FS.readFileSync(fullPath, "utf-8");

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
