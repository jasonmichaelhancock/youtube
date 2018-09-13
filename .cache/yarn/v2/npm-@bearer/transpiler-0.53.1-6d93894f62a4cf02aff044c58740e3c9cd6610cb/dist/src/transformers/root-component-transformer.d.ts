import * as ts from 'typescript';
import { TransformerOptions } from '../types';
export default function RootComponentTransformer({ metadata }?: TransformerOptions): ts.TransformerFactory<ts.SourceFile>;
