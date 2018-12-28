var args = process.argv;

console.log(args);
console.log('A');

if( args[2] === '1'){
    console.log('C1');
} else {
    console.log('C2');
}


if( false ){
    console.log('true c1');
}else {
    console.log('false c2');
}
console.log('D');