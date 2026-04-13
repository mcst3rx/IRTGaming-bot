import { type ElementCompact, xml2js } from "xml-js";

type TElementCompact = {
    [K in keyof ElementCompact]: unknown extends ElementCompact[K] ? never : ElementCompact[K];
};

/**
 * Wrapper function for converting XML data to JSON data. Uses xml-js `compact` option
 * @param data The XML data to convert
 * @returns The converted JSON data
 */
export function jsonFromXML<TData extends Record<string, any> = Record<string, any>>(data: string) {
    return xml2js(data, { compact: true }) as TData & TElementCompact;
}