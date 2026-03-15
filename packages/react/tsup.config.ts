import { defineConfig } from "tsup";
import { baseConfig } from "../../configs/tsup/base";

export default defineConfig({ ...baseConfig, external: ["react", "react-dom"] });
