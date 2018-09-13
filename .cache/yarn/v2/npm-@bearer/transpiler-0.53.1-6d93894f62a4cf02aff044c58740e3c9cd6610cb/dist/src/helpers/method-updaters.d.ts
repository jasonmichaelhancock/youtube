import * as ts from 'typescript';
export declare function prependToStatements(tsMethod: ts.MethodDeclaration, statements: ReadonlyArray<ts.Statement>): ts.MethodDeclaration;
export declare function updateMethodOfClass(classNode: ts.ClassDeclaration, methodeName: string, updater: (method: ts.MethodDeclaration) => ts.MethodDeclaration): ts.ClassDeclaration;
