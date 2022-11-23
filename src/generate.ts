import { resolve, relative } from "path";
import { readdirSync, writeFileSync, existsSync, mkdirSync } from "fs";
import dotenv from "dotenv";
import os from "os";
import * as Figma from "figma-api";
import axios from "axios";
import { transform } from "@svgr/core";

const icoDir = resolve(__dirname, "./icons");
dotenv.config();
const { token, fileId } = process.env;

if (!token || !fileId) {
  console.error("Environment Variables not set.");
  process.exit(1);
}

const icons: {
  [category: string]: {
    [name: string]: {
      [style: string]: string;
    };
  };
} = {};

const download = async (url: string): Promise<string> => {
  try {
    const { data } = await axios.get<string>(url);
    return data;
  } catch (e) {
    return await download(url);
  }
};

const createIndex = ({
  dir,
  indexFileName,
}: {
  dir: string;
  indexFileName: string;
}) => {
  let indexContent = "";
  readdirSync(dir).forEach((componentFileName) => {
    const componentName = (
      componentFileName.substring(0, componentFileName.indexOf(".")) ||
      componentFileName
    )
      .replace(/[-_]+/g, "")
      .replace(/[^\w\s]/g, "")
      .replace(
        /\s+(.)(\w*)/g,
        ($1, $2, $3) => `${$2.toUpperCase() + $3.toLowerCase()}`
      )
      .replace(/\w/, (s) => s.toUpperCase())
      .replace(/ /g, "");
    const relativePathToComponent = relative(
      dir,
      resolve(dir, componentName)
    ).replace(`\\`, `/`);
    const componentExport = `export { default as ${componentName} } from "./${relativePathToComponent}";`;
    indexContent += componentExport + os.EOL;
  });
  writeFileSync(resolve(dir, indexFileName), indexContent);
};

(async () => {
  const api = new Figma.Api({
    personalAccessToken: token,
  });
  console.log(`Get File`);
  const { components } = await api.getFile(fileId, { ids: [`0:1`] });
  const ids = Object.keys(components);
  const chunkSize = 580;
  const urls: { [id: string]: string } = {};
  for (let i = 0; i < ids.length; i += chunkSize) {
    console.log(`Get Image from ${i} to ${i + chunkSize} out of ${ids.length}`);
    Object.assign(
      urls,
      (
        await api.getImage(fileId, {
          ids: ids.slice(i, i + chunkSize).join(`,`),
          format: `svg`,
          scale: 1,
        })
      ).images
    );
  }
  console.log(`Downloading`);
  const svgs: Array<{ name: string; data: string }> = await Promise.all(
    ids.map(async (id) => ({
      name: components[id].name,
      data: await download(urls[id]),
    }))
  );
  console.log(`Converting`);
  await Promise.all(
    svgs.map(async (svg) => {
      let [style, category, name]: Array<string> = svg.name
        .split(` / `)
        .map((text) =>
          text
            .replace(/[-_]+/g, "")
            .replace(/[^\w\s]/g, "")
            .replace(
              /\s+(.)(\w*)/g,
              ($1, $2, $3) => `${$2.toUpperCase() + $3.toLowerCase()}`
            )
            .replace(/\w/, (s) => s.toUpperCase())
            .replace(/ /g, "")
            .replace(/4K/g, `FourK`)
        );
      if (!icons[category]) icons[category] = {};
      if (!icons[category][name]) icons[category][name] = {};
      icons[category][name][style] = (
        await transform(svg.data, {
          typescript: true,
          icon: true,
          svgProps: {
            width: "inherit",
            height: "inherit",
          },
          replaceAttrValues: {
            "#1C274C": "currentColor",
          },
          plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
          template: ({ jsx }, { tpl }) => tpl`${jsx}`,
        })
      ).slice(0, -1);
    })
  );
  console.log(`Saving`);
  Object.keys(icons).forEach((c) => {
    const dir = resolve(icoDir, c);
    if (!existsSync(dir)) mkdirSync(dir);
    Object.keys(icons[c]).forEach((n) => {
      const { Broken, LineDuotone, Linear, Outline, Bold, BoldDuotone } =
        icons[c][n];
      writeFileSync(
        resolve(dir, `${n}.tsx`),
        `import * as React from 'react'; import { IconProps } from '../../types'; import { IconWrapper } from '../IconWrapper'; const ${n} = (allProps: IconProps) => { const { svgProps: props, iconStyle, ...restProps } = allProps; const styles: { [style: string]: React.ReactNode } = { Broken: ${Broken}, LineDuotone: ${LineDuotone}, Linear: ${Linear}, Outline: ${Outline}, Bold: ${Bold}, BoldDuotone: ${BoldDuotone} }; return <IconWrapper icon={styles[iconStyle || 'Linear']} {...restProps} /> }; export default ${n}`
      );
    });
    createIndex({ dir, indexFileName: "index.tsx" });
    console.log(`${c} saved`);
  });
  console.log(`Done`);
})();
