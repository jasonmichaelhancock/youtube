import * as ts from 'typescript';
import { TransformerOptions } from '../types';
export default function GatherMetadata({ metadata }?: TransformerOptions): ts.TransformerFactory<ts.SourceFile>;
