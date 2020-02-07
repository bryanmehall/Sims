export const primitiveOps = {
    addition: (op1, op2) => (op1 + op2),
    subtraction: (op1, op2) => (op1 - op2),
    multiplication: (op1, op2) => (op1 * op2),
    division: (op1, op2) => (op1 / op2),
    and: (op1, op2) => (op1 && op2),
    or: (op1, op2) => (op1 || op2),
    not: (op1) => (!op1),
    conditional: (op1, op2, op3) => (op1 ? op2 : op3),
    equal: (op1, op2) => (op1 === op2),
    lessThan: (op1, op2) => (op1 < op2),
    greaterThan: (op1, op2) => (op1 > op2),
    concat: (op1, op2) => (op1 + op2),
    getIndex: (array, index) => (array[index])
}