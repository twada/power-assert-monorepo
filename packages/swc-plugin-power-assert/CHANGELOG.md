## 0.2.0

#### Bug Fixes

  * expression address to be embedded should be based on UTF-16 instead of UTF8 ((6f7c47c3))
  * store span offset at the beginning of Program/Module node due to SWC issue ((5ef44782))
  * fix UpdateExpression address when prefix is false ((41f4f491))
  * do not capture callee of computed MemberExpression ((93185365))

#### Features

  * support UnaryExpression ((b741ef9e))
  * support NewExpression ((24f28392))
  * support UpdateExpression ((ec884698))
  * support FunctionExpression ((29637b0b))
  * support AwaitExpression ((64c13aaa))
  * support vitest's assert ((a72c6e48))
