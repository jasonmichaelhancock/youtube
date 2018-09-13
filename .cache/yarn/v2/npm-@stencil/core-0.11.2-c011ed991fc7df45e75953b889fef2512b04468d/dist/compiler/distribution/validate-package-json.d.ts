import * as d from '../../declarations';
export declare function validatePackageFiles(config: d.Config, outputTarget: d.OutputTargetDist, diagnostics: d.Diagnostic[], pkgData: d.PackageJsonData): void;
export declare function validateModule(config: d.Config, compilerCtx: d.CompilerCtx, outputTarget: d.OutputTargetDist, diagnostics: d.Diagnostic[], pkgData: d.PackageJsonData): Promise<void>;
export declare function validateMain(config: d.Config, compilerCtx: d.CompilerCtx, outputTarget: d.OutputTargetDist, diagnostics: d.Diagnostic[], pkgData: d.PackageJsonData): Promise<void>;
export declare function validateTypes(config: d.Config, outputTarget: d.OutputTargetDist, diagnostics: d.Diagnostic[], pkgData: d.PackageJsonData): boolean;
export declare function validateTypesExist(config: d.Config, compilerCtx: d.CompilerCtx, outputTarget: d.OutputTargetDist, diagnostics: d.Diagnostic[], pkgData: d.PackageJsonData): Promise<boolean>;
export declare function validateCollection(config: d.Config, outputTarget: d.OutputTargetDist, diagnostics: d.Diagnostic[], pkgData: d.PackageJsonData): void;
export declare function validateBrowser(diagnostics: d.Diagnostic[], pkgData: d.PackageJsonData): void;
export declare function validateNamespace(config: d.Config, diagnostics: d.Diagnostic[]): void;
export declare function getRecommendedTypesPath(config: d.Config, outputTarget: d.OutputTargetDist): string;