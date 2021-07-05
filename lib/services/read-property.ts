'use strict';

import * as baAsn1 from '../asn1';
import * as baEnum from '../enum';
import {EncodeBuffer, BACNetObjectID} from '../types';

export const encode = (buffer: EncodeBuffer, objectType: number, objectInstance: number, propertyId: number, arrayIndex: number) => {
  if (objectType <= baEnum.ASN1_MAX_OBJECT) {
    baAsn1.encodeContextObjectId(buffer, 0, objectType, objectInstance);
  }
  if (propertyId <= baEnum.ASN1_MAX_PROPERTY_ID) {
    baAsn1.encodeContextEnumerated(buffer, 1, propertyId);
  }
  if (arrayIndex !== baEnum.ASN1_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 2, arrayIndex || baEnum.ASN1_ARRAY_ALL);
  }
};

export const decode = (buffer: Buffer, offset: number, apduLen: number) => {
  let len = 0;
  let result: any;
  let decodedValue: any;
  if (apduLen < 7) return;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  len++;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  const objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  const property: any = {};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  property.id = decodedValue.value;
  property.index = baEnum.ASN1_ARRAY_ALL;
  if (len < apduLen) {
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if ((result.tagNumber === 2) && (len < apduLen)) {
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue.len;
      property.index = decodedValue.value;
    } else {
      return;
    }
  }
  if (len < apduLen) return;
  return {
    len: len,
    objectId: objectId,
    property: property
  };
};

export const encodeAcknowledge = (buffer: EncodeBuffer, objectId: BACNetObjectID, propertyId: number, arrayIndex: number, values: any[]) => {
  baAsn1.encodeContextObjectId(buffer, 0, objectId.type, objectId.instance);
  baAsn1.encodeContextEnumerated(buffer, 1, propertyId);
  if (arrayIndex !== baEnum.ASN1_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 2, arrayIndex);
  }
  baAsn1.encodeOpeningTag(buffer, 3);
  values.forEach((value) => baAsn1.bacappEncodeApplicationData(buffer, value));
  baAsn1.encodeClosingTag(buffer, 3);
};

export const decodeAcknowledge = (buffer: Buffer, offset: number, apduLen: number) => {
  let result: any;
  let decodedValue: any;
  const objectId: any = {};
  const property: any = {};
  if (!baAsn1.decodeIsContextTag(buffer, offset, 0)) return;
  let len = 1;
  result = baAsn1.decodeObjectId(buffer, offset + len);
  len += result.len;
  objectId.type = result.objectType;
  objectId.instance = result.instance;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  result = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += result.len;
  property.id = result.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  if (result.tagNumber === 2) {
    len += result.len;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    property.index = decodedValue.value;
  } else {
    property.index = baEnum.ASN1_ARRAY_ALL;
  }
  const values = [];
  if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 3)) return;
  len++;
  while ((apduLen - len) > 1) {
    result = baAsn1.bacappDecodeApplicationData(buffer, offset + len, apduLen + offset, objectId.type, property.id);
    if (!result) return;
    len += result.len;
    delete result.len;
    values.push(result);
  }
  if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 3)) return;
  len++;
  return {
    len: len,
    objectId: objectId,
    property: property,
    values: values
  };
};
