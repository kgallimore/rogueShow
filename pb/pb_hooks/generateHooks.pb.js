/// <reference path="../pb_data/types.d.ts" />

const generateTypes = (e) => {
    console.log("Collection changed - Running type generation...");
    const cmd = $os.cmd(
        "powershell.exe",
        "-Command",
        "cd ../sk; pnpm pb:types",
    );
    const result = toString(cmd.output());
    console.log(result);

    e.next();
};

onCollectionAfterCreateSuccess(generateTypes);
onCollectionAfterUpdateSuccess(generateTypes);
onCollectionAfterDeleteSuccess(generateTypes);
