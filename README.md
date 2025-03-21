# 状態管理ライブラリ Binduct
Binduct は、ツリー構造の状態を簡潔に記述し、コンポーネントと直感的にバインドすることを目的とした、軽量な状態管理ライブラリです。Binduct は、ツリー構造の状態をオブジェクトのプロパティとしてそのまま操作できるシンプルなAPIを提供します。Redux のような dispatch の必要もなく、Jotai のように、どのようなAtomをどこに用意すべきか考える必要もありません。このライブラリはReactを念頭に書かれていますが、何にも依存しない軽量なライブラリであり、他のフレームワークはもちろん、直接DOMを操作するVanilla JavaScriptアプリケーションや、外部APIを呼び出して「状態を自宅のカーテンの開閉状態にバインドする」ことですら簡単に適応可能です。

## 特徴
 - フレームワークやライブラリに依存しない、軽量ライブラリ
 - JavaScript の Proxy を活用した自動的な状態追跡
 - ツリー構造の状態管理を直感的に記述
 - シンプルな API による状態と UI のバインド

## 他のライブラリとの比較
|ライブラリ	| 状態管理モデル	       | 更新の仕組み	| フレームワーク依存|
|-------|----------------------|----------------|-------------|
|Redux	| グローバルストア + Reducer | 明示的な dispatch| なし          |
|Recoil	| Atom + Selector      | useRecoilState | React       |
|Jotai	| Atom	               | useAtom	| React       |
|Vuex	| グローバルストア + Mutation| commit         | Vue         |
|**Binduct**| treeState + 自動スライス | 代入       | なし          |

## 使用方法
### 状態の定義
状態の定義には、`treeState`関数を使用します。

```javascript
import { treeState } from "binduct"

const state = treeState({
  name: "Japan",
  population: 126565654,
  capital: {
    name: "Tokyo",
    location: { lat: 35.34, long: 168.2 }
  }
});
```

このように、`treeState`関数にオブジェクトを渡すと、「リアクティブな状態ツリー」をつくれます。つまり、`state.population` や `state.capital.name` を変更すると、自動的にUIコンポーネントに反映するようにできます。

`treeState`の返り値である「状態プロキシオブジェクト」は、以下のように、普通のオブジェクトのようにプロパティにアクセスすることができます。`treeState`は、普通のオブジェクトに「状態」機能を付け加える魔法のようなものだと思えばよいでしょう。

```javascript
console.log(state.name) // Japan
```

注意: 「状態プロキシオブジェクト」は、プレーンなオブジェクトと極力同じ挙動になるようにしていますが、JavaScriptのProxyオブジェクトの制限により、`for (let x in state) { ... }` によるプロパティの列挙は動作しません。かわりに、`for (let x of Object.keys(state)) { ... }`を使用してください。

#### 参考: 状態プロキシオブジェクトとは？
`treeState` 関数は、渡されたオブジェクトを再帰的にたどり、オブジェクトや配列を見つけると、それらを「状態オブジェクト」として管理し、ツリー構造の状態を構築します。この状態ツリーは Proxy によってラップされ、プロパティアクセスや代入に応じてget や set のトラップが発動し、状態オブジェクトの対応するメソッドを呼び出します。これが「状態プロキシオブジェクト」です。

状態更新時に通知すべきリスナーの一覧は、内部の状態オブジェクトに格納されています。これらの内部データ構造は binduct モジュールからはエクスポートされないため、ユーザーは「状態プロキシオブジェクト」を通じてのみアクセスすることができます。

### 状態の変更

```javascript
state.population = 129565654;
```

通常の JavaScript オブジェクトと同じように代入するだけで、状態が更新され、変更が自動的に検知されます。

オブジェクトを代入するためには、`treeState`でラップする必要があります。

```javascript
state.capital = treeState({
  name: "Osaka",
  location: { lat: 35.2, long: 165.3 },
  lang: "Kansai-Ben"
});
```

ここで、`treeState`が必要なのは、binductが管理する状態ツリーに含まれるすべてのオブジェクトや配列は、「状態」であるというルールがあるためです。
したがって、以下のように、状態ツリーに含まれる別のオブジェクトを代入する場合には、`treeState`でのラップは必要ありません。

```javascript
state.capital = state.cities.Kyoto
```

### コンポーネントへのバインド

#### ReactコンポーネントのStateへのバインド
状態をUIコンポーネントにバインドするためには、`binder`関数を使用します。

```javascript
const [population, setPopulation] = useState(state.population);

useEffect(() => {
  binder(state).population(setPopulation);
}, []);
```

このコードでは、state.population が変化するたびに setPopulation が呼び出され、コンポーネントの population が更新されます。

### 自動スライス機能
```javascript
const [getOriginalCapitalName, setOriginalCapitalName] = useState(state.capital.name);
const [getCurrentCapitalName, setCurrentCapitalName] = useState(state.capital.name);

useEffect(() => {
  binder(state.capital).name(setOriginalCapitalName);
  binder(state).capital.name(setCurrentCapitalName);
}, []);

// elsewhere...
state.capital.name = "Edo"
state.capital = state.cities.Kyoto
```
以上のコードでは、東京が江戸に改名されたあと、日本の首都が京都に変更されたことを表しています。

このコードでは、`setOriginalCapitalName`は、binderの評価時に`state.capital`があらわしていた状態（東京という都市に対応する状態）のnameにバインドされています。したがって、その後state.capitalが更新されても`setOriginalCapitalName`は呼ばれず、`getOriginalCapitalName()`は"Edo"を返します。一方で、`setCurrentCapitalName`は、`state`状態の`.capital.name`というプロパティチェーンにバインドされています。したがって、state.capitalが更新された場合にも`setCurrentCapitalName`は呼ばれます。したがって、`getCurrentCapitalName()`は`state.cities.Kyoto.name`の値を返します。

### 子孫オブジェクトの再バインド
状態ツリーの末端の数値や文字列ではなく、途中のノードであるオブジェクトにバインドした場合は、セッター関数に「状態プロキシオブジェクト」が渡されます。したがって、propsなどを通じて子孫コンポーネントにこのオブジェクトを渡せば、渡された状態オブジェクトを起点にバインドすることができます。

CountryView:
```jsx
const [getCapital, setCapital] = useState(state.capital);
useEffect(() => {
  binder(state).capital(capital);
}, []);
return (<div> ... <CityView city={getCapital()} /> ... </div>)
```

CityView:
```javascript
const [getName, setName] = useState(props.city.name);
useEffect(() => {
  binder(props.city).name(setName);
}, []);
```

### 配列の変更
treeStateに渡す初期値の状態ツリーには、配列を含むことができます。ただし、状態の更新処理が実行されるのは代入のみであり、普通のbinderは、配列の破壊的変更(pushやpop)を無視します。そのため、pushやpopによる破壊的変更を監視するインタフェースとして、updateを用意しています。

```javascript
import { treeState, binder, update } from 'binduct'
const [getList, setList] = useState(state.list);

// state.list に新たな値が代入された場合を監視
binder(state).list(setList)
// state.list 自体が破壊的関数により更新された場合を監視
binder(state).list[update](setList)
```
この機能を使用するためには、updateシンボルを'binduct'からインポートする必要があります。Array組み込みの破壊的変更関数により配列が更新されたとき、リスナーとして登録された関数 setList には、以下のような動作を行う関数が引数として渡されます。

1. 関数は、コンポーネントが保持する「元の値」を入力として取る。
2. 元の値をsliceによりコピーする。
3. コピーした値に、binduct側の状態が更新されたときと同じ破壊的関数を適用する。
4. 破壊的変更を実行後のコピーした配列を返す。

この動作は、Reactの状態更新のインタフェースと互換性があるので、setListをそのまま登録するだけで状態の同期ができます。

また、状態が更新されたときと同じ破壊的関数を適用するという性質を利用して、単なるコピーを取りたいわけではない場合でも、updateによる同期が適用可能です。
```javascript
binder(state).list((value) => setList(value.map((x) => x.summary)))
binder(state).list[update](setList)
```

### React以外の例
`binder`によるバインドは、値が変更されたときに、新しい値を引数に呼び出す関数を登録するだけの機能です。したがって、以下のようにフレームワークなしの簡素なJavaScriptアプリケーションに適用することも、外部APIの呼び出しにバインドすることもできます。

#### フレームワークなしの例
```javascript
const state = treeState({ count: 0 });
binder(state).count((value) => document.querySelector("#counter").textContent = value;);
state.count++;
```

#### 外部APIを呼び出す例
```javascript
binder(state).curtainOpen(async (isOpen) => {
  await fetch("https://api.switch-bot.com/v1.1/devices/{deviceId}/commands", {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_ACCESS_TOKEN",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      command: isOpen ? "open" : "close",
      parameter: "default",
      commandType: "command"
    })
  });
});
```

## 制約
Binduct は状態変更時に即座にリスナーに通知を行います。ただし、React の setState はイベントループ内の複数の setState 呼び出しを自動的にバッチ処理するため、通常の React コンポーネントに接続した場合はこの挙動による問題は発生しません。しかし、React以外において限定的な状況（例: 素のDOM操作により更新し、更新でリフローが生じてしまう場合など）では、複数の状態変更時にパフォーマンスの悪化を招く可能性があります。その場合、ユーザー側でバッチ処理を実装する必要があります。
